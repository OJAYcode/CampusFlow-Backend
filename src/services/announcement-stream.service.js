const clientsByUser = new Map();

function subscribe(userId, res) {
  if (!clientsByUser.has(String(userId))) clientsByUser.set(String(userId), []);
  const list = clientsByUser.get(String(userId));
  list.push(res);

  // cleanup when connection closes
  const onClose = () => {
    const lst = clientsByUser.get(String(userId)) || [];
    clientsByUser.set(String(userId), lst.filter((r) => r !== res));
  };

  res.on("close", onClose);
  return () => onClose();
}

function notifyForUsers(userIds, payload) {
  const asJson = typeof payload === "string" ? payload : JSON.stringify(payload);
  for (const uid of userIds || []) {
    const list = clientsByUser.get(String(uid)) || [];
    for (const res of list) {
      try {
        res.write(`event: announcement\n`);
        res.write(`data: ${asJson}\n\n`);
      } catch (e) {
        // ignore individual client errors
      }
    }
  }
}

module.exports = { subscribe, notifyForUsers };
