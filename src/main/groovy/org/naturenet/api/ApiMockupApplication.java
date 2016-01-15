package org.naturenet.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.time.LocalDateTime;

@SpringBootApplication
public class ApiMockupApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiMockupApplication.class, args);
    }

    /**
     * Configures the JSON serializer.
     */
    @Bean
    public ObjectMapper objectMapper() {
        SimpleModule module = new SimpleModule("java.time Serialization");
        module.addSerializer(LocalDateTime.class, new JavaTimeSerializer());

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(module);

        // pretty printing because this is a dev stack
        mapper.configure(SerializationFeature.INDENT_OUTPUT, true);
        return mapper;
    }
}
