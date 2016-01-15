package org.naturenet.api.controllers;

import org.naturenet.api.model.DesignIdea;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping(produces = "application/json")
public class IdeasController {

    @RequestMapping("/ideas")
    public List<DesignIdea> list(@RequestParam(required = false, defaultValue = "0") int offset,
                                 @RequestParam(required = false, defaultValue = "5") int limit,
                                 @RequestParam(required = false, defaultValue = "false") boolean allUsers) {
        List<DesignIdea> ideas = new ArrayList<>(limit);
        int userId = -1;
        for (int i = 0; i < limit; i++) {
            DesignIdea idea = DesignIdea.random();
            if (!allUsers && userId != -1) {
                idea.setUser_id(userId);
            } else {
                userId = idea.getUser_id();
            }
            ideas.add(idea);
        }
        return ideas;
    }

}
