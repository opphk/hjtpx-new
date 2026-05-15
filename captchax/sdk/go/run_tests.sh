#!/bin/bash

set -e

echo "========================================="
echo "CaptchaX Go SDK 测试套件"
echo "========================================="
echo ""

cd "$(dirname "$0")"

echo "1. 运行单元测试..."
go test -v -short -run "Test.*" ./captchax/... 2>&1 | grep -E "(^=== RUN|^--- PASS|^--- FAIL|^PASS|^FAIL)" || true
echo ""

echo "2. 运行集成测试..."
go test -v -short -run "Test.*" ./captchax/... 2>&1 | grep -E "(^=== RUN|^--- PASS|^--- FAIL|^PASS|^FAIL)" || true
echo ""

echo "3. 运行并发测试..."
go test -v -short -run "TestConcurrent" ./captchax/... 2>&1 | grep -E "(^=== RUN|^--- PASS|^--- FAIL|^PASS|^FAIL)" || true
echo ""

echo "4. 运行内部包测试..."
go test -v -short ./captchax/internal/... 2>&1 | grep -E "(^=== RUN|^--- PASS|^--- FAIL|^PASS|^FAIL)" || true
echo ""

echo "5. 生成测试覆盖率报告..."
go test -coverprofile=coverage.out ./captchax/... 2>&1 | tail -n 5
echo ""

echo "覆盖率摘要:"
go tool cover -func=coverage.out 2>&1 | tail -n 10
echo ""

echo "6. 运行基准测试 (示例)..."
go test -bench="BenchmarkNewClient|BenchmarkSliderCaptcha" -benchmem -run=^$ ./captchax/... 2>&1 | head -n 20
echo ""

echo "========================================="
echo "测试完成!"
echo "========================================="
