-- Compatibility shim for minimal TeX Live installs.
-- LuaTeX-ja's bundled CCT metric provides the Chinese punctuation behavior
-- needed by ctex when the optional chinese-jfm package is unavailable.
dofile(kpse.find_file('jfm-CCT.lua'))
