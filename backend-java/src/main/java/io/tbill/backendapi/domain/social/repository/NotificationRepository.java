package io.tbill.backendapi.domain.social.repository;

import io.tbill.backendapi.domain.social.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientEmailOrderByIdDesc(String recipientEmail, Pageable pageable);

    Page<Notification> findByRecipientEmailAndReadFalseOrderByIdDesc(String recipientEmail, Pageable pageable);

    long countByRecipientEmailAndReadFalse(String recipientEmail);

    Optional<Notification> findByIdAndRecipientEmail(Long id, String recipientEmail);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipientEmail = :email AND n.read = false")
    int markAllRead(@Param("email") String recipientEmail);
}
