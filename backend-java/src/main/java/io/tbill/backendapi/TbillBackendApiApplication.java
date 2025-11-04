package io.tbill.backendapi;

import io.github.cdimascio.dotenv.Dotenv; // 1. import
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TbillBackendApiApplication {

    public static void main(String[] args) {

        // 환경 변수 로드
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMissing()
                .load();

        dotenv.entries().forEach(entry ->
                System.setProperty(entry.getKey(), entry.getValue())
        );

        SpringApplication.run(TbillBackendApiApplication.class, args);
    }
}