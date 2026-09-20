package com.notifyhub.query;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class QueryCleanupJob {
    private final QueryRepository repository;
    private final long retentionDays;

    public QueryCleanupJob(QueryRepository repository, @Value("${notifyhub.query-retention-days:30}") long retentionDays) {
        this.repository = repository;
        this.retentionDays = retentionDays;
    }

    @Transactional
    @Scheduled(cron = "${notifyhub.query-cleanup-cron:0 0 2 * * *}")
    public void deleteAnsweredQueries() {
        repository.deleteByStatusAndAnsweredAtBefore(QueryStatus.ANSWERED, Instant.now().minus(retentionDays, ChronoUnit.DAYS));
    }
}