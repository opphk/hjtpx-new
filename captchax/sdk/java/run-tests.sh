#!/bin/bash

echo "========================================="
echo "CaptchaX Java SDK 测试验证脚本"
echo "========================================="
echo ""

echo "1. 检查 Java 版本..."
java -version
echo ""

echo "2. 检查 Maven 版本..."
mvn -version
echo ""

echo "3. 编译项目..."
mvn compile
if [ $? -ne 0 ]; then
    echo "编译失败!"
    exit 1
fi
echo ""

echo "4. 运行单元测试..."
mvn test -Dtest=CaptchaXClientUnitTest
if [ $? -ne 0 ]; then
    echo "单元测试失败!"
    exit 1
fi
echo ""

echo "5. 运行 Mock 测试..."
mvn test -Dtest=CaptchaXClientMockTest
if [ $? -ne 0 ]; then
    echo "Mock 测试失败!"
    exit 1
fi
echo ""

echo "6. 运行集成测试..."
mvn test -Dtest=CaptchaXClientIntegrationTest
if [ $? -ne 0 ]; then
    echo "集成测试失败!"
    exit 1
fi
echo ""

echo "7. 生成测试覆盖率报告..."
mvn test jacoco:report
echo ""

echo "========================================="
echo "所有测试通过!"
echo "========================================="
echo ""
echo "覆盖率报告位置: target/site/jacoco/index.html"
