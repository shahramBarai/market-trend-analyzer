const handleConnection = (socket) => {
  console.log("A client connected:", socket.id);

  socket.on("subscribe", (subscription) => {
    handleSubscription(socket, subscription);
  });

  socket.on("unsubscribe", (subscription) => {
    handleUnsubscription(socket, subscription);
  });

  socket.on("disconnect", () => {
    handleDisconnection(socket);
  });
};

const handleSubscription = (socket, subscription) => {
  const { share, dataType } = subscription;

  if (dataType === "advis") {
    socket.join(`share_advis:${share}`);
  }

  if (dataType === "tick") {
    socket.join(`share_tick:${share}`);
  }

  // In handleSubscription
  console.log(`Socket ${socket.id} joined rooms:`, Array.from(socket.rooms));
};

const handleUnsubscription = (socket, subscription) => {
  console.log(`Client ${socket.id} unsubscribed from:`, subscription);

  const { share, dataType } = subscription;

  if (dataType === "advis") {
    socket.leave(`share_advis:${share}`);
  }

  if (dataType === "tick") {
    socket.leave(`share_tick:${share}`);
  }
};

const handleDisconnection = (socket) => {
  console.log("A client disconnected:", socket.id);
  // Socket.io automatically handles room cleanup on disconnect
};

export { handleConnection };
