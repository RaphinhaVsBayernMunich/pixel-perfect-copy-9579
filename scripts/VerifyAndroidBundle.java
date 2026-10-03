import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.security.cert.*;
import java.util.*;
import java.util.jar.*;

// Verify the built bundle cryptographically against a public certificate exported
// from the owner's keystore. No password or private key is read by this verifier.
public class VerifyAndroidBundle {
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Expected AAB and public certificate paths.");
        X509Certificate expected;
        try (InputStream input = Files.newInputStream(Path.of(args[1]))) {
            expected = (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(input);
        }
        expected.checkValidity();
        int verifiedEntries = 0;
        try (JarFile bundle = new JarFile(args[0], true)) {
            if (bundle.getJarEntry("BundleConfig.pb") == null || bundle.getJarEntry("base/manifest/AndroidManifest.xml") == null)
                throw new SecurityException("Required Android bundle structure is missing.");
            Enumeration<JarEntry> entries = bundle.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                if (entry.isDirectory() || entry.getName().startsWith("META-INF/")) continue;
                try (InputStream input = bundle.getInputStream(entry)) {
                    input.transferTo(OutputStream.nullOutputStream());
                }
                java.security.cert.Certificate[] certificates = entry.getCertificates();
                if (certificates == null || Arrays.stream(certificates).noneMatch(expected::equals))
                    throw new SecurityException("Bundle payload is unsigned or does not match the owner's certificate.");
                verifiedEntries++;
            }
        }
        if (verifiedEntries == 0) throw new SecurityException("No signed payload entries found.");
        String fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(expected.getEncoded()));
        System.out.println("{\"signed\":true,\"ownerCertificateMatches\":true,\"verifiedEntries\":" + verifiedEntries + ",\"certificateSha256\":\"" + fingerprint + "\",\"certificateSignatureAlgorithm\":\"" + expected.getSigAlgName() + "\"}");
    }
}