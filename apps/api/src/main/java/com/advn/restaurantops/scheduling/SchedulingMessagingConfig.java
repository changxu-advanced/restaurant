package com.advn.restaurantops.scheduling;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

@Configuration
public class SchedulingMessagingConfig {
    private static final Logger log = LoggerFactory.getLogger(SchedulingMessagingConfig.class);

    @Bean
    @Profile("local")
    SchedulingRequestPublisher localPublisher() {
        return (jobId, tenantId, storeId) -> log.info("Demo scheduling job queued: {}", jobId);
    }

    @Bean
    @Profile("!local")
    SchedulingRequestPublisher sqsPublisher(SqsClient client, @Value("${app.scheduling-request-queue-url}") String queueUrl) {
        return (jobId, tenantId, storeId) -> client.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody("{\"jobId\":\"%s\",\"tenantId\":\"%s\",\"storeId\":\"%s\"}".formatted(jobId, tenantId, storeId))
                .build());
    }

    @Bean
    @Profile("!local")
    SqsClient sqsClient() { return SqsClient.create(); }
}

