package org.naturenet;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.naturenet.api.ApiMockupApplication;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.boot.test.SpringApplicationConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

@RunWith(SpringJUnit4ClassRunner.class)
@SpringApplicationConfiguration(classes = ApiMockupApplication.class)
@WebAppConfiguration
public class ApiMockupApplicationTests {

	@Test
	public void contextLoads() {
	}

}
