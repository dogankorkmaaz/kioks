package com.company.kiosk.data

import java.security.MessageDigest
import java.security.SecureRandom

/** Salted PIN hashing so the exit/settings PIN is never stored in plaintext. */
object PinManager {

    private const val SALT_BYTES = 16

    fun generateSalt(): String {
        val salt = ByteArray(SALT_BYTES)
        SecureRandom().nextBytes(salt)
        return salt.joinToString("") { "%02x".format(it) }
    }

    fun hash(pin: String, salt: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        digest.update(salt.toByteArray())
        val hashBytes = digest.digest(pin.toByteArray())
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    fun verify(candidate: String, salt: String?, expectedHash: String?): Boolean {
        if (salt == null || expectedHash == null) return false
        return hash(candidate, salt) == expectedHash
    }
}
