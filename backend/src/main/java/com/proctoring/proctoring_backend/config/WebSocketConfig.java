package com.proctoring.proctoring_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // In-memory broker prefix for real-time invigilator subscriptions
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Pure WebSocket endpoint for standard WebRTC & STOMP clients
        registry.addEndpoint("/ws-proctor")
                .setAllowedOriginPatterns("*");
        // Fallback SockJS endpoint
        registry.addEndpoint("/ws-proctor-sockjs")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Allow high-throughput image frames & WebRTC signaling without drops
        registration.setMessageSizeLimit(10 * 1024 * 1024);   // 10 MB
        registration.setSendBufferSizeLimit(20 * 1024 * 1024); // 20 MB
        registration.setSendTimeLimit(20000);                 // 20 sec
    }
}
