package com.advn.restaurantops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class RestaurantOpsApplication {
    public static void main(String[] args) {
        SpringApplication.run(RestaurantOpsApplication.class, args);
    }
}

