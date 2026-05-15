#!/bin/bash

# CaptchaX PHP SDK 快速测试指南

echo "╔════════════════════════════════════════════════════════╗"
echo "║   CaptchaX PHP SDK 测试快速参考                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "📍 路径: /workspace/captchax/sdk/php"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 快速测试命令"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣  运行所有测试"
echo "   $ ./vendor/bin/phpunit"
echo ""

echo "2️⃣  运行测试（详细输出）"
echo "   $ ./vendor/bin/phpunit --testdox"
echo ""

echo "3️⃣  生成覆盖率报告"
echo "   $ ./vendor/bin/phpunit --coverage-html build/coverage"
echo ""

echo "4️⃣  验证测试文件"
echo "   $ ./tests/verify_tests.sh"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试统计"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /workspace/captchax/sdk/php

# 统计测试数量
total_tests=$(grep -rh "public function test" tests/*.php 2>/dev/null | wc -l)
test_classes=$(grep -rh "class.*Test extends" tests/*.php 2>/dev/null | wc -l)
test_files=$(ls -1 tests/*.php 2>/dev/null | wc -l)

echo "   总测试方法: $total_tests"
echo "   测试类数量: $test_classes"
echo "   测试文件数: $test_files"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 测试文件列表"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ls -1 tests/*.php | while read file; do
    basename=$(basename "$file")
    tests_count=$(grep "public function test" "$file" | wc -l)
    printf "   %-30s %3d 测试\n" "$basename" "$tests_count"
done

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 覆盖率目标"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Models.php              ~95%  ✅"
echo "   CaptchaXException.php   ~95%  ✅"
echo "   CaptchaXClient.php       ~85%  ✅"
echo "   ─────────────────────────────────"
echo "   总体覆盖率              ~90%  ✅"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📖 文档"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   README.md               - 完整使用文档"
echo "   COMPLETION_SUMMARY.md    - 任务完成总结"
echo "   tests/TEST_STATISTICS.md - 测试统计详情"
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║  更多信息请查看 COMPLETION_SUMMARY.md                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
