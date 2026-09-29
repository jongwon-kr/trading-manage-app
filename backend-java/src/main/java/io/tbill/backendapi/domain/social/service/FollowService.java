package io.tbill.backendapi.domain.social.service;

import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.domain.content.service.FollowingProvider;
import io.tbill.backendapi.domain.social.dto.SocialDto;
import io.tbill.backendapi.domain.social.entity.Follow;
import io.tbill.backendapi.domain.social.repository.FollowRepository;
import io.tbill.backendapi.domain.user.entity.User;
import io.tbill.backendapi.domain.user.repository.UserRepository;
import io.tbill.backendapi.global.exception.CommunityException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** 사용자 프로필·팔로우. username 으로 찾는다 (이메일은 노출하지 않는다) */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FollowService implements FollowingProvider {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final ContentRepository contentRepository;
    private final ApplicationEventPublisher events;

    /** 팔로우 알림 이벤트 */
    public record Followed(String followerEmail, String followeeEmail) {}

    public SocialDto.Profile profile(String username, String viewerEmail) {
        User user = findUser(username);
        String email = user.getEmail();
        return new SocialDto.Profile(user.getUsername(), contentRepository.countByAuthorEmailAndIsDeletedFalse(email),
                followRepository.countByFolloweeEmail(email), followRepository.countByFollowerEmail(email),
                followRepository.existsByFollowerEmailAndFolloweeEmail(viewerEmail, email), email.equals(viewerEmail));
    }

    @Transactional
    public SocialDto.FollowResult follow(String username, String viewerEmail) {
        String target = findUser(username).getEmail();
        if (target.equals(viewerEmail)) {
            throw CommunityException.badRequest("자기 자신은 팔로우할 수 없습니다.");
        }
        if (!followRepository.existsByFollowerEmailAndFolloweeEmail(viewerEmail, target)) {
            followRepository.save(new Follow(viewerEmail, target));
            events.publishEvent(new Followed(viewerEmail, target));
        }
        return new SocialDto.FollowResult(true, followRepository.countByFolloweeEmail(target));
    }

    @Transactional
    public SocialDto.FollowResult unfollow(String username, String viewerEmail) {
        String target = findUser(username).getEmail();
        followRepository.findByFollowerEmailAndFolloweeEmail(viewerEmail, target).ifPresent(followRepository::delete);
        return new SocialDto.FollowResult(false, followRepository.countByFolloweeEmail(target));
    }

    @Override
    public List<String> followeeEmails(String followerEmail) {
        return followRepository.findFolloweeEmails(followerEmail);
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> CommunityException.notFound("사용자를 찾을 수 없습니다."));
    }
}
