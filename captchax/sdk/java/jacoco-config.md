# JaCoCo 配置

JaCoCo 用于测试覆盖率分析。由于当前环境网络限制，此功能已暂时禁用。

## 启用 JaCoCo

要启用 JaCoCo 覆盖率分析，请取消注释 `pom.xml` 中的以下插件：

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>${jacoco.version}</version>
    <executions>
        <execution>
            <id>prepare-agent</id>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                            <limit>
                                <counter>BRANCH</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.60</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

## 生成覆盖率报告

```bash
mvn test jacoco:report
```

报告将生成在 `target/site/jacoco/index.html`

## 覆盖率目标

- **行覆盖率**: 80%+
- **分支覆盖率**: 60%+
