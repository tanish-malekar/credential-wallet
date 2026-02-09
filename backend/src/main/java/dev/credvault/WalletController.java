package dev.credvault;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@RestController
@RequestMapping("/api")
public class WalletController {
 private final JdbcTemplate db;
 public WalletController(JdbcTemplate db) { this.db=db; }
 // Subject identifiers are scoped to the issuer; no browser-supplied member ID is trusted.
 private String member(OidcUser user) {
  try {
   return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((user.getIssuer()+"|"+user.getSubject()).getBytes(StandardCharsets.UTF_8)));
  } catch (Exception e) {throw new IllegalStateException(e);}
 }
 @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token) { return Map.of("headerName",token.getHeaderName(),"token",token.getToken()); }
 @GetMapping("/session") public Map<String,Object> session(Authentication auth) {
  if (auth==null || !(auth.getPrincipal() instanceof OidcUser user)) return Map.of("authenticated",false);
  return Map.of("authenticated",true,"issuer",user.getIssuer().toString(),"expiresAt",user.getExpiresAt().toString());
 }
 @GetMapping("/credentials") @Transactional
 public List<Map<String,Object>> credentials(@AuthenticationPrincipal OidcUser user) {
  String member=member(user);
  // All credential cards are synthetic; OIDC login does not verify student or employment status.
  for (var kind:List.of("STUDENT","COMMUNITY")) {
   UUID id=UUID.nameUUIDFromBytes((member+":"+kind).getBytes(StandardCharsets.UTF_8));
   db.update("INSERT INTO credential(id,member_id,title,kind) VALUES (?,?,?,?) ON CONFLICT(member_id,kind) DO NOTHING",id,member,kind.equals("STUDENT")?"Demo student credential":"Demo community credential",kind);
  }
  return db.queryForList("SELECT id,title,kind,CASE WHEN status='REVOKED' THEN 'REVOKED' WHEN expires_at <= now() THEN 'EXPIRED' ELSE 'ACTIVE' END AS status,issued_at,expires_at FROM credential WHERE member_id=? ORDER BY kind",member);
 }
 public record Consent(boolean profile, boolean email) {}
 @GetMapping("/consent") public Consent consent(@AuthenticationPrincipal OidcUser user) { return readConsent(member(user)); }
 private Consent readConsent(String member) {
  var rows=db.query("SELECT profile_allowed,email_allowed FROM consent WHERE member_id=?",(rs,n)->new Consent(rs.getBoolean(1),rs.getBoolean(2)),member);
  return rows.isEmpty()?new Consent(false,false):rows.getFirst();
 }
 @PutMapping("/consent") public Consent save(@AuthenticationPrincipal OidcUser user, @RequestBody Consent consent) {
  db.update("INSERT INTO consent(member_id,profile_allowed,email_allowed) VALUES (?,?,?) ON CONFLICT(member_id) DO UPDATE SET profile_allowed=EXCLUDED.profile_allowed,email_allowed=EXCLUDED.email_allowed,updated_at=now()",member(user),consent.profile(),consent.email());
  return consent;
 }
 @GetMapping("/profile") public Map<String,Object> profile(@AuthenticationPrincipal OidcUser user) {
  Consent consent=readConsent(member(user));
  Map<String,Object> result=new LinkedHashMap<>();
  if (consent.profile()) result.put("name",Objects.requireNonNullElse(user.getFullName(),"Unnamed member"));
  if (consent.email()) { result.put("email",Objects.requireNonNullElse(user.getEmail(),"Not provided")); result.put("emailVerified",Boolean.TRUE.equals(user.getEmailVerified())); }
  return result;
 }
 @PostMapping("/credentials/{id}/revoke") public Map<String,String> revoke(@AuthenticationPrincipal OidcUser user,@PathVariable UUID id) {
  int changed=db.update("UPDATE credential SET status='REVOKED' WHERE id=? AND member_id=?",id,member(user));
  if(changed==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Credential not found");
  return Map.of("status","REVOKED");
 }
}
