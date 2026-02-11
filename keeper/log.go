package main

import (
	"fmt"
	"time"
)

var keeperTag string

func initLog(name string) {
	keeperTag = name
}

func logInfo(msg string, kv ...any) { writeLog("INFO", msg, kv...) }
func logWarn(msg string, kv ...any) { writeLog("WARN", msg, kv...) }
func logErr(msg string, kv ...any)  { writeLog("ERR ", msg, kv...) }

func writeLog(level, msg string, kv ...any) {
	ts := time.Now().Format("15:04:05.000")
	extra := ""
	for i := 0; i+1 < len(kv); i += 2 {
		extra += fmt.Sprintf(" %v=%v", kv[i], kv[i+1])
	}
	fmt.Printf("%s [%s] %s %s%s\n", ts, keeperTag, level, msg, extra)
}

func short(addr string) string {
	if len(addr) < 10 {
		return addr
	}
	return addr[:4] + ".." + addr[len(addr)-4:]
}
