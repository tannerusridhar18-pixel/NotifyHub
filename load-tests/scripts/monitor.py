import subprocess
import time
import json
import sys
import os

def get_mysql_stats():
    cmd = ["C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe", "-u", "root", "-proot@123", "-e", "SHOW STATUS WHERE Variable_name IN ('Threads_connected', 'Threads_running', 'Connections');"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        stats = {}
        for line in res.stdout.strip().split("\n"):
            parts = line.split("\t")
            if len(parts) == 2:
                stats[parts[0]] = parts[1]
        return stats
    except Exception as e:
        return {"error": str(e)}

def get_process_stats():
    ps_cmd = '$conn = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($conn) { Get-Process -Id $conn.OwningProcess | Select-Object Id, CPU, WorkingSet64, @{Name="Threads";Expression={$_.Threads.Count}} | ConvertTo-Json }'
    try:
        res = subprocess.run(["powershell", "-Command", ps_cmd], capture_output=True, text=True, timeout=5)
        data = json.loads(res.stdout)
        return {
            "java_pid": data.get("Id"),
            "java_cpu_sec": data.get("CPU"),
            "java_mem_mb": round(data.get("WorkingSet64", 0) / (1024 * 1024), 2),
            "java_threads": data.get("Threads")
        }
    except Exception as e:
        return {"java_error": str(e)}

def get_overall_cpu():
    ps_cmd = '(Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory, TotalVisibleMemorySize | ConvertTo-Json)'
    try:
        res = subprocess.run(["powershell", "-Command", ps_cmd], capture_output=True, text=True, timeout=5)
        mem = json.loads(res.stdout)
        free_mb = round(mem.get("FreePhysicalMemory", 0) / 1024, 2)
        total_mb = round(mem.get("TotalVisibleMemorySize", 0) / 1024, 2)
        used_pct = round((total_mb - free_mb) / total_mb * 100, 2) if total_mb else 0
        return {"free_ram_mb": free_mb, "ram_used_pct": used_pct}
    except Exception as e:
        return {"mem_error": str(e)}

def main():
    output_file = sys.argv[1] if len(sys.argv) > 1 else "load-tests/results/system-metrics.json"
    interval = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0
    duration = float(sys.argv[3]) if len(sys.argv) > 3 else 700.0  # default 700s
    
    samples = []
    start_time = time.time()
    print(f"Monitoring started. Sampling every {interval}s for {duration}s -> {output_file}")
    
    while time.time() - start_time < duration:
        t_now = time.strftime("%Y-%m-%d %H:%M:%S")
        p_stats = get_process_stats()
        m_stats = get_mysql_stats()
        sys_stats = get_overall_cpu()
        
        sample = {
            "timestamp": t_now,
            "elapsed_sec": round(time.time() - start_time, 1),
            **p_stats,
            **m_stats,
            **sys_stats
        }
        samples.append(sample)
        
        # Write continuously to file so partial runs are preserved
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(samples, f, indent=2)
        except Exception:
            pass
            
        time.sleep(interval)
        
    print(f"Monitoring completed. {len(samples)} samples saved to {output_file}")

if __name__ == "__main__":
    main()
