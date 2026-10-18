package com.notifyhub.integration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.Test;
import org.springframework.boot.jdbc.DataSourceBuilder;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StagingDatabaseMigrationTest {

    @Test
    void validatesCleanFlywayMigrationAgainstStagingDatabase() throws Exception {
        String username = System.getenv().getOrDefault("DB_USERNAME", "root");
        String password = System.getenv().getOrDefault("DB_PASSWORD", "root@123");
        String baseUrl = System.getenv().getOrDefault("DB_URL", "jdbc:mysql://localhost:3306/notifyhub?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true");
        
        // Derive staging database URL
        String stagingUrl = baseUrl.contains("/notifyhub") 
                ? baseUrl.replace("/notifyhub", "/notifyhub_staging")
                : "jdbc:mysql://localhost:3306/notifyhub_staging?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";

        // Create staging database if not exists
        DataSource rootDataSource = DataSourceBuilder.create()
                .url(baseUrl)
                .username(username)
                .password(password)
                .build();

        try (Connection conn = rootDataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE DATABASE IF NOT EXISTS notifyhub_staging;");
        }

        DataSource dataSource = DataSourceBuilder.create()
                .url(stagingUrl)
                .username(username)
                .password(password)
                .build();

        // Clean staging database tables before migration test
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("SET FOREIGN_KEY_CHECKS = 0;");
            ResultSet rs = stmt.executeQuery("SHOW TABLES;");
            List<String> tables = new ArrayList<>();
            while (rs.next()) {
                tables.add(rs.getString(1));
            }
            for (String table : tables) {
                stmt.execute("DROP TABLE IF EXISTS `" + table + "`;");
            }
            stmt.execute("SET FOREIGN_KEY_CHECKS = 1;");
        }

        // Run Flyway migrations from scratch on notifyhub_staging
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .cleanDisabled(false)
                .load();

        flyway.migrate();

        // Verify all migrations applied successfully
        MigrationInfo[] applied = flyway.info().applied();
        assertThat(applied).isNotEmpty();
        System.out.println("Successfully applied " + applied.length + " Flyway migrations to staging database:");
        for (MigrationInfo info : applied) {
            System.out.println(" - " + info.getVersion() + ": " + info.getDescription() + " [" + info.getState() + "]");
            assertThat(info.getState().isApplied()).isTrue();
        }

        // Verify key tables exist in notifyhub_staging
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SHOW TABLES;")) {
            List<String> tables = new ArrayList<>();
            while (rs.next()) {
                tables.add(rs.getString(1));
            }
            assertThat(tables).contains(
                    "users",
                    "roles",
                    "departments",
                    "events",
                    "announcements",
                    "event_registrations",
                    "refresh_tokens",
                    "audit_log",
                    "flyway_schema_history"
            );
            System.out.println("Verified " + tables.size() + " tables in notifyhub_staging database.");
        }
    }

    @Test
    void provisionsAndValidatesLeastPrivilegeStagingUser() throws Exception {
        String rootUser = System.getenv().getOrDefault("DB_USERNAME", "root");
        String rootPass = System.getenv().getOrDefault("DB_PASSWORD", "root@123");
        String baseUrl = System.getenv().getOrDefault("DB_URL", "jdbc:mysql://localhost:3306/notifyhub?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true");

        DataSource rootDs = DataSourceBuilder.create()
                .url(baseUrl)
                .username(rootUser)
                .password(rootPass)
                .build();

        try (Connection conn = rootDs.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE USER IF NOT EXISTS 'nh_staging'@'%' IDENTIFIED BY 'StagingPass_#2026';");
            stmt.execute("GRANT ALL PRIVILEGES ON notifyhub_staging.* TO 'nh_staging'@'%';");
            stmt.execute("FLUSH PRIVILEGES;");
        }

        // Connect using least-privilege staging user
        String stagingUrl = baseUrl.contains("/notifyhub")
                ? baseUrl.replace("/notifyhub", "/notifyhub_staging")
                : "jdbc:mysql://localhost:3306/notifyhub_staging?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";

        DataSource stagingDs = DataSourceBuilder.create()
                .url(stagingUrl)
                .username("nh_staging")
                .password("StagingPass_#2026")
                .build();

        try (Connection conn = stagingDs.getConnection(); Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT DATABASE();")) {
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString(1)).isEqualTo("notifyhub_staging");
        }
    }
}
