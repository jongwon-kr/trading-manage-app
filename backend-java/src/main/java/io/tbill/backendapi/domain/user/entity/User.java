package io.tbill.backendapi.domain.user.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", updatable = false)
    private Long id;

    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    /** 기존 행이 있어도 ddl-auto:update 가 실패하지 않도록 DB 기본값 USER */
    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 16, columnDefinition = "varchar(16) default 'USER' not null")
    private UserRole role = UserRole.USER;

    @Builder
    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = UserRole.USER;
    }

    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }
}
