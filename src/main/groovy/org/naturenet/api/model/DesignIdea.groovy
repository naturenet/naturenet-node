package org.naturenet.api.model

import java.time.LocalDateTime

class DesignIdea {

    int id
    int user_id
    String heading
    String idea
    LocalDateTime created_at
    LocalDateTime updated_at

    /**
     * @return a design idea with randomly generated values.
     */
    static def DesignIdea random() {
        def idea = new DesignIdea(
                id: SampleValues.RNG.nextInt(),
                user_id: SampleValues.RNG.nextInt(),
                heading: SampleValues.stringOfLength(80),
                idea: SampleValues.stringOfWords(40),
                created_at: SampleValues.date()
        )
        idea.updated_at = idea.created_at.plusHours(1)
        return idea
    }

}
