import java.io.File;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Signature;
import java.util.Arrays;

// Exit codes only: never print exceptions, keys, or entered credentials.
class VerifySigningCredentials {
    public static void main(String[] args) {
        char[] storePassword = System.getenv("QUESTOS_KEYSTORE_PASSWORD").toCharArray();
        char[] keyPassword = System.getenv("QUESTOS_KEY_PASSWORD").toCharArray();
        int result = 0;
        try {
            KeyStore store;
            try { store = KeyStore.getInstance(new File(System.getenv("QUESTOS_KEYSTORE_PATH")), storePassword); }
            catch (Exception error) { System.exit(10); return; }
            String alias = System.getenv("QUESTOS_KEY_ALIAS");
            if (!store.isKeyEntry(alias)) { System.exit(12); return; }
            try {
                PrivateKey key = (PrivateKey) store.getKey(alias, keyPassword);
                Signature signature = Signature.getInstance(key.getAlgorithm().equals("RSA") ? "SHA256withRSA" : "SHA256withECDSA");
                byte[] probe = "QuestOS private signing verification".getBytes(java.nio.charset.StandardCharsets.UTF_8);
                signature.initSign(key);
                signature.update(probe);
                byte[] signed = signature.sign();
                signature.initVerify(store.getCertificate(alias));
                signature.update(probe);
                if (!signature.verify(signed)) result = 11;
            } catch (Exception error) { result = 11; }
        } catch (Exception error) { result = 13; }
        finally { Arrays.fill(storePassword, '\0'); Arrays.fill(keyPassword, '\0'); }
        System.exit(result);
    }
}
