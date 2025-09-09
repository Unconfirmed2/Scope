PIDS=$(lsof -ti tcp:3000 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "Found PIDs: $PIDS";
  for p in $PIDS; do
    echo "Killing PID $p";
    kill -9 $p 2>/dev/null || echo "Failed to kill $p";
  done
else
  echo "No PIDs found by lsof on port 3000. Trying ss...";
  PIDS=$(ss -ltnp 2>/dev/null | awk '/:3000/ { for(i=1;i<=NF;i++) if ($i ~ /pid=/) { match($i, /pid=([0-9]+)/, a); if(a[1]) print a[1] } }' | sort -u)
  if [ -n "$PIDS" ]; then
    echo "Found PIDs via ss: $PIDS";
    for p in $PIDS; do
      echo "Killing PID $p";
      kill -9 $p 2>/dev/null || echo "Failed to kill $p";
    done
  else
    echo "No processes found listening on port 3000.";
  fi
fi

# verification
echo "\nPost-kill verification:";
ss -ltnp | grep ':3000' || echo "No tcp listeners on :3000";
lsof -i :3000 || echo "lsof shows nothing on :3000";

echo "\nRemaining 'next'/'next-server' processes:";
ps aux | grep -E '[n]ext-server|[n]ext( |$)' || true
