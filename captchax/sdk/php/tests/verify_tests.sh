#!/bin/bash

# CaptchaX PHP SDK 测试验证脚本

echo "========================================"
echo "CaptchaX PHP SDK 测试文件验证"
echo "========================================"
echo ""

# 定义颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 定义路径
SDK_PATH="/workspace/captchax/sdk/php"
TEST_PATH="$SDK_PATH/tests"

# 检查文件是否存在
echo "1. 检查测试文件是否存在..."
echo "----------------------------------------"

test_files=(
    "CaptchaXClientTest.php"
    "ModelsTest.php"
    "CaptchaXClientMockTest.php"
    "ErrorHandlingTest.php"
    "IntegrationTest.php"
    "TypeHintingTest.php"
    "TEST_STATISTICS.md"
)

all_exist=true
for file in "${test_files[@]}"; do
    if [ -f "$TEST_PATH/$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (不存在)"
        all_exist=false
    fi
done

echo ""

# 检查 PHP 语法
echo "2. 检查 PHP 语法..."
echo "----------------------------------------"

php_errors=0
for file in "$TEST_PATH"/*.php; do
    if [ -f "$file" ]; then
        result=$(php -l "$file" 2>&1)
        if echo "$result" | grep -q "No syntax errors"; then
            echo -e "${GREEN}✓${NC} $(basename $file)"
        else
            echo -e "${RED}✗${NC} $(basename $file)"
            echo "  $result"
            php_errors=$((php_errors + 1))
        fi
    fi
done

echo ""

# 统计测试数量
echo "3. 统计测试数量..."
echo "----------------------------------------"

total_tests=$(grep -rh "public function test" "$TEST_PATH"/*.php | wc -l)
echo "总测试方法数: $total_tests"

# 统计测试类
test_classes=$(grep -rh "class.*Test extends" "$TEST_PATH"/*.php | wc -l)
echo "测试类数量: $test_classes"

# 统计文件大小
echo ""
echo "4. 测试文件大小..."
echo "----------------------------------------"
for file in "${test_files[@]}"; do
    if [ -f "$TEST_PATH/$file" ]; then
        size=$(stat -f%z "$TEST_PATH/$file" 2>/dev/null || stat -c%s "$TEST_PATH/$file" 2>/dev/null)
        echo "$file: $size bytes"
    fi
done

echo ""

# 总结
echo "========================================"
echo "验证结果总结"
echo "========================================"

if [ "$all_exist" = true ] && [ $php_errors -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！${NC}"
    echo ""
    echo "测试文件已成功创建并通过验证。"
    echo "总计: $total_tests 个测试方法，分布在 $test_classes 个测试类中。"
    exit 0
else
    echo -e "${RED}✗ 存在错误${NC}"
    if [ "$all_exist" = false ]; then
        echo "- 部分测试文件不存在"
    fi
    if [ $php_errors -gt 0 ]; then
        echo "- $php_errors 个文件存在 PHP 语法错误"
    fi
    exit 1
fi
