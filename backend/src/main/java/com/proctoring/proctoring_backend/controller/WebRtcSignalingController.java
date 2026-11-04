package com.proctoring.proctoring_backend.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * WebRTC signaling relay over STOMP WebSocket.
 *
 * Flow:
 *  1. Laptop sends SDP offer -> /app/webrtc/{sessionId}/offer
 *     -> relayed to /topic/webrtc/{sessionId}/offer (mobile subscribes)
 *
 *  2. Mobile sends SDP answer -> /app/webrtc/{sessionId}/answer
 *     -> relayed to /topic/webrtc/{sessionId}/answer (laptop subscribes)
 *
 *  3. Laptop ICE candidates -> /app/webrtc/{sessionId}/ice-laptop
 *     -> relayed to /topic/webrtc/{sessionId}/ice-laptop (mobile subscribes)
 *
 *  4. Mobile ICE candidates -> /app/webrtc/{sessionId}/ice-mobile
 *     -> relayed to /topic/webrtc/{sessionId}/ice-mobile (laptop subscribes)
 *
 *  5. Mobile ready notification -> /app/webrtc/{sessionId}/mobile-ready
 *     -> relayed to /topic/webrtc/{sessionId}/mobile-ready (laptop subscribes)
 *
 *  Proctor viewer flow:
 *  6. Proctor sends offer -> /app/webrtc/{sessionId}/proctor-offer
 *     -> relayed to /topic/webrtc/{sessionId}/proctor-offer (mobile subscribes)
 *
 *  7. Mobile sends proctor answer -> /app/webrtc/{sessionId}/proctor-answer
 *     -> relayed to /topic/webrtc/{sessionId}/proctor-answer (proctor subscribes)
 *
 *  8. ICE for proctor path -> ice-proctor-caller, ice-proctor-mobile
 */
@Controller
public class WebRtcSignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    public WebRtcSignalingController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /** Laptop -> Mobile: SDP Offer */
    @MessageMapping("/webrtc/{sessionId}/offer")
    public void relayOffer(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/offer", (Object) payload);
    }

    /** Mobile -> Laptop: SDP Answer */
    @MessageMapping("/webrtc/{sessionId}/answer")
    public void relayAnswer(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/answer", (Object) payload);
    }

    /** Laptop -> Mobile: ICE Candidates */
    @MessageMapping("/webrtc/{sessionId}/ice-laptop")
    public void relayIceLaptop(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/ice-laptop", (Object) payload);
    }

    /** Mobile -> Laptop: ICE Candidates */
    @MessageMapping("/webrtc/{sessionId}/ice-mobile")
    public void relayIceMobile(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/ice-mobile", (Object) payload);
    }

    /** Mobile -> Laptop: Mobile Ready notification */
    @MessageMapping("/webrtc/{sessionId}/mobile-ready")
    public void relayMobileReady(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/mobile-ready", (Object) payload);
    }

    /** Proctor -> Mobile: SDP Offer for viewer connection */
    @MessageMapping("/webrtc/{sessionId}/proctor-offer")
    public void relayProctorOffer(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/proctor-offer", (Object) payload);
    }

    /** Mobile -> Proctor: SDP Answer for viewer connection */
    @MessageMapping("/webrtc/{sessionId}/proctor-answer")
    public void relayProctorAnswer(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/proctor-answer", (Object) payload);
    }

    /** Proctor -> Mobile: ICE for proctor viewer */
    @MessageMapping("/webrtc/{sessionId}/ice-proctor-caller")
    public void relayIceProctorCaller(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/ice-proctor-caller", (Object) payload);
    }

    /** Mobile -> Proctor: ICE for proctor viewer */
    @MessageMapping("/webrtc/{sessionId}/ice-proctor-mobile")
    public void relayIceProctorMobile(@DestinationVariable String sessionId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + sessionId + "/ice-proctor-mobile", (Object) payload);
    }
}
