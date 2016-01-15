package org.naturenet.api.model
import groovy.transform.Canonical

import java.time.LocalDateTime

@Canonical
class Observation {

    int id
    int activity_id
    int user_id
    LocalDateTime created_at
    LocalDateTime updated_at
    String description
    String location

    /**
     * @return an observation with randomly generated values.
     */
    static def Observation random(float centerLat = 0, float centerLon = 0, float radius = 10_000) {
        def obs = new Observation(
                id: SampleValues.RNG.nextInt(),
                activity_id: SampleValues.RNG.nextInt(),
                user_id: SampleValues.RNG.nextInt(),
                created_at: SampleValues.date(),
                description: SampleValues.stringOfWords(100),
                location: SampleValues.coordinates(centerLat, centerLon, radius).toListString())
        obs.updated_at = obs.created_at.plusHours(1)
        return obs
    }

}
