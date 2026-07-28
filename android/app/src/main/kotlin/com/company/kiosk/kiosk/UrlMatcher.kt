package com.company.kiosk.kiosk

/**
 * Decides whether a navigated-to host is allowed, given a profile's whitelist/blacklist.
 * Patterns support a leading `*.` wildcard (e.g. `*.example.com` matches `intranet.example.com`
 * and `example.com` itself); anything else is matched as an exact host.
 */
object UrlMatcher {

    fun isAllowed(host: String?, whitelist: List<String>, blacklist: List<String>): Boolean {
        if (host == null) return false
        if (blacklist.any { matches(host, it) }) return false
        if (whitelist.isEmpty()) return true
        return whitelist.any { matches(host, it) }
    }

    private fun matches(host: String, pattern: String): Boolean {
        val trimmed = pattern.trim().removePrefix("https://").removePrefix("http://").trimEnd('/')
        if (trimmed.startsWith("*.")) {
            val suffix = trimmed.removePrefix("*.")
            return host.equals(suffix, ignoreCase = true) || host.endsWith(".$suffix", ignoreCase = true)
        }
        return host.equals(trimmed, ignoreCase = true)
    }
}
