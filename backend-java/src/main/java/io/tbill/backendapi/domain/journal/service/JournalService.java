package io.tbill.backendapi.domain.journal.service;

import io.tbill.backendapi.domain.journal.dto.JournalDto;

import java.util.List;

public interface JournalService {

    JournalDto.JournalInfo createJournal(JournalDto.CreateCommand command);

    List<JournalDto.JournalInfo> getJournalsByUserEmail(String email);

    JournalDto.JournalInfo getJournalById(Long journalId, String authorEmail);

}
