package io.tbill.backendapi.infrastructure.config;

import io.tbill.backendapi.infrastructure.kafka.dto.AnalysisRequest;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    /**
     * AnalysisRequest DTO를 전송하기 위한 ProducerFactory Bean을 정의합니다.
     * Key: String, Value: JSON (AnalysisRequest)
     */
    @Bean
    public ProducerFactory<String, AnalysisRequest> analysisRequestProducerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

        // Value를 AnalysisRequest DTO 객체 그대로 보내기 위해 JsonSerializer를 사용합니다.
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);

        // JsonSerializer가 DTO의 전체 클래스 경로를 메시지에 포함하도록 설정
        configProps.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);
        // Python에서 쉽게 파싱할 수 있도록 __TypeId__ 헤더 대신,
        // 특정 타입(analysisRequest)을 지정된 DTO 클래스로 매핑합니다.
        configProps.put(JsonSerializer.TYPE_MAPPINGS,
                "analysisRequest:io.tbill.backendapi.infrastructure.kafka.dto.AnalysisRequest");


        return new DefaultKafkaProducerFactory<>(configProps);
    }

    /**
     * KafkaProducerService가 주입받을 KafkaTemplate Bean을 생성합니다.
     * 위에서 정의한 analysisRequestProducerFactory를 사용합니다.
     */
    @Bean
    public KafkaTemplate<String, AnalysisRequest> kafkaTemplate() {
        return new KafkaTemplate<>(analysisRequestProducerFactory());
    }
}