require 'spec_helper'
require 'captchax'

RSpec.describe CaptchaX::Client do
  let(:client) { described_class.new(base_url: 'https://api.example.com', app_id: 'test-app', retry_times: 3) }

  describe '#initialize' do
    it 'creates a client with configuration' do
      expect(client).to be_a(CaptchaX::Client)
    end

    it 'raises error when base_url is missing' do
      expect { described_class.new }.to raise_error(CaptchaX::ConfigurationError)
    end

    it 'sets default timeout' do
      default_client = described_class.new(base_url: 'https://api.example.com')
      expect(default_client.instance_variable_get(:@config)[:timeout]).to eq(10_000)
    end

    it 'sets default retry_times' do
      default_client = described_class.new(base_url: 'https://api.example.com')
      expect(default_client.instance_variable_get(:@config)[:retry_times]).to eq(3)
    end

    it 'sets default api_version to v1' do
      default_client = described_class.new(base_url: 'https://api.example.com')
      expect(default_client.instance_variable_get(:@config)[:api_version]).to eq(:v1)
    end

    it 'accepts custom api_version' do
      v2_client = described_class.new(base_url: 'https://api.example.com', api_version: :v2)
      expect(v2_client.instance_variable_get(:@config)[:api_version]).to eq(:v2)
    end

    it 'sets app_id in headers when provided' do
      expect(client.instance_variable_get(:@config)[:app_id]).to eq('test-app')
    end
  end

  describe '#connection' do
    it 'creates Faraday connection with timeout' do
      conn = client.connection
      expect(conn).to be_a(Faraday::Connection)
      expect(conn.options.timeout).to eq(10.0)
    end

    it 'sets Accept header to JSON' do
      conn = client.connection
      expect(conn.headers['Accept']).to eq('application/json')
    end

    it 'sets X-App-Id header when app_id is provided' do
      conn = client.connection
      expect(conn.headers['X-App-Id']).to eq('test-app')
    end

    it 'memoizes connection' do
      conn1 = client.connection
      conn2 = client.connection
      expect(conn1).to equal(conn2)
    end
  end

  describe '#health_check' do
    it 'returns health status' do
      stub_request(:get, 'https://api.example.com/v1/health')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { status: 'healthy' })
        )

      result = client.health_check
      expect(result[:status]).to eq('healthy')
    end
  end

  describe '#generate_slider_captcha' do
    it 'generates slider captcha' do
      stub_request(:post, 'https://api.example.com/v1/captcha/slider')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'captcha-123' })
        )

      result = client.generate_slider_captcha
      expect(result[:id]).to eq('captcha-123')
    end

    it 'passes scenario_id when provided' do
      stub_request(:post, 'https://api.example.com/v1/captcha/slider')
        .with(
          headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' },
          body: 'scenario_id=scenario-1'
        )
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'captcha-123' })
        )

      result = client.generate_slider_captcha(scenario_id: 'scenario-1')
      expect(result[:id]).to eq('captcha-123')
    end
  end

  describe '#verify_slider_captcha' do
    it 'verifies slider captcha' do
      stub_request(:post, 'https://api.example.com/v1/captcha/slider/verify')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { success: true })
        )

      result = client.verify_slider_captcha(captcha_id: 'captcha-123', distance: 0.95)
      expect(result[:success]).to be true
    end
  end

  describe '#generate_click_captcha' do
    it 'generates click captcha' do
      stub_request(:post, 'https://api.example.com/v1/captcha/click')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'click-456' })
        )

      result = client.generate_click_captcha
      expect(result[:id]).to eq('click-456')
    end
  end

  describe '#verify_click_captcha' do
    it 'verifies click captcha' do
      stub_request(:post, 'https://api.example.com/v1/captcha/click/verify')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { success: true, score: 0.95 })
        )

      clicks = [CaptchaX::CharPosition.new(char: 'A', x: 100, y: 50)]
      result = client.verify_click_captcha(captcha_id: 'click-456', clicks: clicks)
      expect(result[:success]).to be true
      expect(result[:score]).to eq(0.95)
    end
  end

  describe '#generate_puzzle_captcha' do
    it 'generates puzzle captcha' do
      stub_request(:post, 'https://api.example.com/v1/captcha/puzzle')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'puzzle-789' })
        )

      result = client.generate_puzzle_captcha
      expect(result[:id]).to eq('puzzle-789')
    end
  end

  describe '#verify_puzzle_captcha' do
    it 'verifies puzzle captcha' do
      stub_request(:post, 'https://api.example.com/v1/captcha/puzzle/verify')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { success: true })
        )

      result = client.verify_puzzle_captcha(captcha_id: 'puzzle-789', distance: 0.98)
      expect(result[:success]).to be true
    end
  end

  describe '#batch_verify' do
    it 'verifies multiple captchas' do
      stub_request(:post, 'https://api.example.com/v1/captcha/batch/verify')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(
            code: 0,
            message: 'success',
            data: {
              results: [{ captcha_id: 'captcha-1', success: true }],
              summary: { total: 1, success: 1, failed: 0, skipped: 0 }
            }
          )
        )

      items = [CaptchaX::BatchVerifyItem.new(captcha_id: 'captcha-1', type: 'slider', target_x: 100)]
      result = client.batch_verify(items: items)
      expect(result[:summary][:total]).to eq(1)
    end
  end

  describe '#list_scenarios' do
    it 'returns scenario list' do
      stub_request(:get, 'https://api.example.com/v1/scenarios')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: [{ id: 'scenario-1', name: 'Test' }])
        )

      result = client.list_scenarios
      expect(result).to be_an(Array)
      expect(result.first[:name]).to eq('Test')
    end
  end

  describe '#create_scenario' do
    it 'creates a scenario' do
      stub_request(:post, 'https://api.example.com/v1/scenarios')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'scenario-new', name: 'New' })
        )

      result = client.create_scenario(name: 'New')
      expect(result[:name]).to eq('New')
    end
  end

  describe '#get_scenario' do
    it 'returns a scenario' do
      stub_request(:get, 'https://api.example.com/v1/scenarios/scenario-123')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'scenario-123' })
        )

      result = client.get_scenario('scenario-123')
      expect(result[:id]).to eq('scenario-123')
    end
  end

  describe '#update_scenario' do
    it 'updates a scenario' do
      stub_request(:put, 'https://api.example.com/v1/scenarios/scenario-123')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'scenario-123', name: 'Updated' })
        )

      result = client.update_scenario(scenario_id: 'scenario-123', name: 'Updated')
      expect(result[:name]).to eq('Updated')
    end
  end

  describe '#delete_scenario' do
    it 'deletes a scenario and returns true' do
      stub_request(:delete, 'https://api.example.com/v1/scenarios/scenario-123')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: nil)
        )

      result = client.delete_scenario('scenario-123')
      expect(result).to be true
    end
  end

  describe '#list_webhooks' do
    it 'returns webhook list' do
      stub_request(:get, 'https://api.example.com/v1/webhooks')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: [{ id: 'webhook-1', url: 'https://example.com' }])
        )

      result = client.list_webhooks
      expect(result).to be_an(Array)
      expect(result.first[:url]).to eq('https://example.com')
    end
  end

  describe '#create_webhook' do
    it 'creates a webhook' do
      stub_request(:post, 'https://api.example.com/v1/webhooks')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'webhook-new', url: 'https://example.com/newhook' })
        )

      result = client.create_webhook(url: 'https://example.com/newhook', events: ['verify.success'])
      expect(result[:url]).to eq('https://example.com/newhook')
    end
  end

  describe '#get_webhook' do
    it 'returns a webhook' do
      stub_request(:get, 'https://api.example.com/v1/webhooks/webhook-123')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'webhook-123' })
        )

      result = client.get_webhook('webhook-123')
      expect(result[:id]).to eq('webhook-123')
    end
  end

  describe '#update_webhook' do
    it 'updates a webhook' do
      stub_request(:put, 'https://api.example.com/v1/webhooks/webhook-123')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { id: 'webhook-123', enabled: false })
        )

      result = client.update_webhook(webhook_id: 'webhook-123', enabled: false)
      expect(result[:enabled]).to be false
    end
  end

  describe '#delete_webhook' do
    it 'deletes a webhook and returns true' do
      stub_request(:delete, 'https://api.example.com/v1/webhooks/webhook-123')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: nil)
        )

      result = client.delete_webhook('webhook-123')
      expect(result).to be true
    end
  end

  describe 'error handling' do
    it 'raises ApiError on HTTP error' do
      stub_request(:get, 'https://api.example.com/v1/health')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(status: 500, body: 'Internal Server Error')

      expect { client.health_check }.to raise_error(CaptchaX::ApiError)
    end

    it 'raises TimeoutError on Faraday::TimeoutError' do
      stub_request(:get, 'https://api.example.com/v1/health')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_raise(Faraday::TimeoutError.new('Connection timeout'))

      expect { client.health_check }.to raise_error(CaptchaX::TimeoutError)
    end

    it 'raises TimeoutError on Faraday::ConnectionFailed' do
      stub_request(:get, 'https://api.example.com/v1/health')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_raise(Faraday::ConnectionFailed.new('Connection refused'))

      expect { client.health_check }.to raise_error(CaptchaX::TimeoutError)
    end
  end

  describe 'retry mechanism' do
    it 'retries on 500 error' do
      counter = 0
      stub_request(:get, 'https://api.example.com/v1/health')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return do
          counter += 1
          if counter < 2
            { status: 500, body: 'Internal Server Error' }
          else
            { status: 200, headers: { 'Content-Type' => 'application/json' }, body: JSON.generate(code: 0, message: 'success', data: { status: 'healthy' }) }
          end
        end

      result = client.health_check
      expect(result[:status]).to eq('healthy')
      expect(counter).to eq(2)
    end
  end

  describe 'API versioning' do
    it 'uses v1 by default' do
      stub_request(:get, 'https://api.example.com/v1/health')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => 'test-app' })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { status: 'healthy' })
        )

      result = client.health_check
      expect(result[:status]).to eq('healthy')
    end

    it 'uses custom api_version' do
      v2_client = described_class.new(base_url: 'https://api.example.com', api_version: :v2)

      stub_request(:get, 'https://api.example.com/v2/health')
        .with(headers: { 'Accept' => 'application/json', 'X-App-Id' => nil })
        .to_return(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: JSON.generate(code: 0, message: 'success', data: { status: 'healthy' })
        )

      result = v2_client.health_check
      expect(result[:status]).to eq('healthy')
    end
  end

  describe 'CaptchaX factory method' do
    it 'creates client with default configuration' do
      captchax = CaptchaX.new(base_url: 'https://api.example.com')
      expect(captchax).to be_a(CaptchaX::Client)
      expect(captchax.instance_variable_get(:@config)[:timeout]).to eq(10_000)
      expect(captchax.instance_variable_get(:@config)[:retry_times]).to eq(3)
      expect(captchax.instance_variable_get(:@config)[:api_version]).to eq(:v1)
    end

    it 'creates client with custom configuration' do
      captchax = CaptchaX.new(
        base_url: 'https://api.example.com',
        app_id: 'custom-app',
        timeout: 30_000,
        retry_times: 5,
        api_version: :v2
      )
      config = captchax.instance_variable_get(:@config)
      expect(config[:app_id]).to eq('custom-app')
      expect(config[:timeout]).to eq(30_000)
      expect(config[:retry_times]).to eq(5)
      expect(config[:api_version]).to eq(:v2)
    end
  end
end
