package org.naturenet.api.controllers;

import org.naturenet.api.model.Observation;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping(produces = "application/json")
public class ObservationsController {

    @RequestMapping("/observations")
    public List<Observation> list(@RequestParam int siteId,
                                  @RequestParam(required = false, defaultValue = "0") int offset,
                                  @RequestParam(required = false, defaultValue = "5") int limit) {
        List<Observation> observations = new ArrayList<>(limit);
        for (int i = 0; i < limit; i++) {
            observations.add(Observation.random());
        }
        return observations;
    }

    @RequestMapping("/observations/near")
    public List<Observation> nearby(@RequestParam float lat,
                                    @RequestParam float lon,
                                    @RequestParam(required = false, defaultValue = "100") float radius) {
        List<Observation> observations = new ArrayList<>(50);
        for (int i = 0; i < 50; i++) {
            observations.add(Observation.random(lat, lon, radius));
        }
        return observations;
    }


}
