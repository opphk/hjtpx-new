package captchax

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type httpClient struct {
	baseURL    string
	timeout    time.Duration
	retryTimes int
	headers    map[string]string
	mu         sync.RWMutex
	client     *http.Client
}

func newHTTPClient(baseURL string, timeout time.Duration, retryTimes int) *httpClient {
	baseURL = strings.TrimSuffix(baseURL, "/")
	return &httpClient{
		baseURL:    baseURL,
		timeout:    timeout,
		retryTimes: retryTimes,
		headers: map[string]string{
			"Content-Type": "application/json",
			"Accept":       "application/json",
		},
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *httpClient) setHeader(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.headers[key] = value
}

func (c *httpClient) setHeaders(headers map[string]string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k, v := range headers {
		c.headers[k] = v
	}
}

func (c *httpClient) buildURL(endpoint string) string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if strings.HasPrefix(endpoint, "http") {
		return endpoint
	}
	endpoint = strings.TrimPrefix(endpoint, "/")
	return fmt.Sprintf("%s/%s", c.baseURL, endpoint)
}

func (c *httpClient) request(ctx context.Context, method, endpoint string, body interface{}, deduplicationID string) ([]byte, *Error) {
	c.mu.RLock()
	headers := make(map[string]string)
	for k, v := range c.headers {
		headers[k] = v
	}
	baseURL := c.baseURL
	retryTimes := c.retryTimes
	client := c.client
	c.mu.RUnlock()

	var lastErr error
	for attempt := 0; attempt <= retryTimes; attempt++ {
		req, err := c.buildRequest(ctx, method, endpoint, body, deduplicationID, headers, baseURL)
		if err != nil {
			return nil, NewError(err.Error())
		}

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			if attempt < retryTimes {
				time.Sleep(time.Duration(1<<uint(attempt)) * time.Second)
				continue
			}
			return nil, NewError(fmt.Sprintf("request failed after %d attempts: %v", retryTimes+1, err))
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, NewError(fmt.Sprintf("failed to read response: %v", err))
		}

		if resp.StatusCode >= 500 && attempt < retryTimes {
			lastErr = fmt.Errorf("server error: %d", resp.StatusCode)
			time.Sleep(time.Duration(1<<uint(attempt)) * time.Second)
			continue
		}

		if resp.StatusCode >= 400 {
			var apiResp APIResponse
			if err := json.Unmarshal(respBody, &apiResp); err == nil && apiResp.Message != "" {
				return nil, NewErrorWithCode(apiResp.Message, apiResp.Code, resp.StatusCode)
			}
			return nil, NewErrorWithCode(fmt.Sprintf("HTTP error: %d", resp.StatusCode), resp.StatusCode, resp.StatusCode)
		}

		return respBody, nil
	}

	return nil, NewError(fmt.Sprintf("request failed after %d attempts: %v", retryTimes+1, lastErr))
}

func (c *httpClient) buildRequest(ctx context.Context, method, endpoint string, body interface{}, deduplicationID string, headers map[string]string, baseURL string) (*http.Request, error) {
	urlStr := c.buildURLFromBase(baseURL, endpoint)
	var reqBody io.Reader

	if body != nil && method != http.MethodGet {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, urlStr, reqBody)
	if err != nil {
		return nil, err
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	if deduplicationID != "" {
		req.Header.Set("X-Deduplication-ID", deduplicationID)
	}

	return req, nil
}

func (c *httpClient) buildURLFromBase(baseURL, endpoint string) string {
	if strings.HasPrefix(endpoint, "http") {
		return endpoint
	}
	endpoint = strings.TrimPrefix(endpoint, "/")
	return fmt.Sprintf("%s/%s", baseURL, endpoint)
}

func (c *httpClient) get(ctx context.Context, endpoint string) ([]byte, *Error) {
	return c.request(ctx, http.MethodGet, endpoint, nil, "")
}

func (c *httpClient) post(ctx context.Context, endpoint string, body interface{}, deduplicationID string) ([]byte, *Error) {
	return c.request(ctx, http.MethodPost, endpoint, body, deduplicationID)
}

func (c *httpClient) put(ctx context.Context, endpoint string, body interface{}) ([]byte, *Error) {
	return c.request(ctx, http.MethodPut, endpoint, body, "")
}

func (c *httpClient) delete(ctx context.Context, endpoint string) ([]byte, *Error) {
	return c.request(ctx, http.MethodDelete, endpoint, nil, "")
}

func (c *httpClient) parseResponse(body []byte, v interface{}) *Error {
	var apiResp APIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return NewError(fmt.Sprintf("failed to parse response: %v", err))
	}

	if apiResp.Code != 0 && apiResp.Code != 200 {
		return NewErrorWithCode(apiResp.Message, apiResp.Code, 400)
	}

	if v != nil {
		if dataBytes, err := json.Marshal(apiResp); err == nil {
			if err := json.Unmarshal(dataBytes, v); err != nil {
				return NewError(fmt.Sprintf("failed to unmarshal data: %v", err))
			}
		}
	}

	return nil
}
