package dev.credvault;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
@Configuration
public class SecurityConfig {
 @Bean SecurityFilterChain security(HttpSecurity http, ClientRegistrationRepository registrations) throws Exception {
  var resolver=new DefaultOAuth2AuthorizationRequestResolver(registrations,"/oauth2/authorization");
  resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
  http.authorizeHttpRequests(auth -> auth.requestMatchers("/api/session","/api/csrf","/error").permitAll().anyRequest().authenticated())
   .exceptionHandling(errors -> errors.defaultAuthenticationEntryPointFor(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED), req -> req.getRequestURI().startsWith("/api/")))
   .oauth2Login(login -> login.authorizationEndpoint(ep -> ep.authorizationRequestResolver(resolver))
    .defaultSuccessUrl("http://localhost:5173/",true).failureUrl("http://localhost:5173/?login=failed"))
   .logout(logout -> logout.logoutSuccessUrl("http://localhost:5173/").invalidateHttpSession(true).deleteCookies("JSESSIONID"));
  // Keep default CSRF protection. The UI fetches the session token from /api/csrf.
  return http.build();
 }
}
