package io.tbill.backendapi.domain.content.service;

import java.util.List;

/** 게시글 '팔로잉만' 필터용: 내가 팔로우한 사용자 이메일 목록 (user 도메인 FollowService 가 구현) */
public interface FollowingProvider {

    List<String> followeeEmails(String followerEmail);
}
