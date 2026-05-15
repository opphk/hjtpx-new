package captchax

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"sort"
	"strings"
	"text/tabwriter"
)

type CoverageReport struct {
	Mode      string
	Local     string
	Functions []FunctionCoverage
}

type FunctionCoverage struct {
	Name   string
	Count  int
	Cover  int
	Uncover int
}

func GenerateCoverageReport() error {
	cmd := exec.Command("go", "test", "-coverprofile=coverage.out", "-covermode=atomic", "./...")
	cmd.Dir = "/workspace/captchax/sdk/go"
	cmd.Run()

	cmd = exec.Command("go", "tool", "cover", "-func=coverage.out")
	cmd.Dir = "/workspace/captchax/sdk/go"
	output, err := cmd.Output()
	if err != nil {
		return err
	}

	report := parseCoverageOutput(string(output))
	return printReport(report)
}

func parseCoverageOutput(output string) *CoverageReport {
	report := &CoverageReport{
		Functions: make([]FunctionCoverage, 0),
	}

	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "total:") {
			report.Local = extractCoverage(line)
			continue
		}

		parts := strings.Split(line, "\t")
		if len(parts) >= 2 {
			name := strings.TrimSpace(parts[0])
			coverage := strings.TrimSpace(parts[len(parts)-1])

			funcCov := FunctionCoverage{
				Name: name,
			}

			if coverage != "undefined" {
				fmt.Sscanf(coverage, "%d.%d%%", &funcCov.Cover, &funcCov.Count)
			}

			report.Functions = append(report.Functions, funcCov)
		}
	}

	return report
}

func extractCoverage(line string) string {
	re := regexp.MustCompile(`(\d+\.\d+%)`)
	match := re.FindString(line)
	return match
}

func printReport(report *CoverageReport) error {
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)

	fmt.Fprintln(w, "Coverage Report")
	fmt.Fprintln(w, strings.Repeat("=", 80))
	fmt.Fprintf(w, "Overall Coverage:\t%s\n", report.Local)
	fmt.Fprintln(w)

	fmt.Fprintln(w, "Function Coverage:")
	fmt.Fprintln(w, strings.Repeat("-", 80))
	fmt.Fprintf(w, "Function Name\tCoverage\n")

	sort.Slice(report.Functions, func(i, j int) bool {
		return report.Functions[i].Name < report.Functions[j].Name
	})

	for _, fn := range report.Functions {
		coverage := "N/A"
		if fn.Count > 0 {
			coverage = fmt.Sprintf("%d.%d%%", fn.Count, fn.Cover)
		}
		fmt.Fprintf(w, "%s\t%s\n", fn.Name, coverage)
	}

	w.Flush()
	return nil
}

func SaveCoverageJSON(filename string) error {
	cmd := exec.Command("go", "test", "-coverprofile=coverage.out", "-covermode=atomic", "./...")
	cmd.Dir = "/workspace/captchax/sdk/go"
	cmd.Run()

	cmd = exec.Command("go", "tool", "cover", "-json=coverage.out")
	cmd.Dir = "/workspace/captchax/sdk/go"
	output, err := cmd.Output()
	if err != nil {
		return err
	}

	return os.WriteFile(filename, output, 0644)
}

func GenerateHTMLCoverage(filename string) error {
	cmd := exec.Command("go", "tool", "cover", "-html=coverage.out", "-o", filename)
	cmd.Dir = "/workspace/captchax/sdk/go"
	return cmd.Run()
}

func printDetailedCoverage() {
	fmt.Println("\nDetailed Coverage Information:")
	fmt.Println("==============================")
	fmt.Println("\nUnit Tests (unit_test.go):")
	fmt.Println("  - Client creation and configuration tests")
	fmt.Println("  - Config builder pattern tests")
	fmt.Println("  - Error handling tests")
	fmt.Println("  - Type serialization tests")
	fmt.Println("  - HTTP client tests")

	fmt.Println("\nIntegration Tests (integration_test.go):")
	fmt.Println("  - Health check integration")
	fmt.Println("  - Slider captcha generation and verification")
	fmt.Println("  - Click captcha generation and verification")
	fmt.Println("  - Puzzle captcha generation and verification")
	fmt.Println("  - Batch verification")
	fmt.Println("  - Scenario management (CRUD)")
	fmt.Println("  - Webhook management (CRUD)")
	fmt.Println("  - Context cancellation and timeout")
	fmt.Println("  - Concurrent request handling")

	fmt.Println("\nConcurrent Tests (concurrent_test.go):")
	fmt.Println("  - Concurrent health checks")
	fmt.Println("  - Concurrent captcha generation")
	fmt.Println("  - Concurrent captcha verification")
	fmt.Println("  - Concurrent batch operations")
	fmt.Println("  - Concurrent scenario operations")
	fmt.Println("  - Concurrent webhook operations")
	fmt.Println("  - Mutex contention tests")
	fmt.Println("  - High concurrency stress tests")

	fmt.Println("\nBenchmark Tests (benchmark_test.go):")
	fmt.Println("  - Client creation benchmarks")
	fmt.Println("  - HTTP request benchmarks")
	fmt.Println("  - Captcha generation benchmarks")
	fmt.Println("  - Captcha verification benchmarks")
	fmt.Println("  - Concurrent operation benchmarks")
	fmt.Println("  - JSON serialization benchmarks")
	fmt.Println("  - Mutex performance benchmarks")
}
