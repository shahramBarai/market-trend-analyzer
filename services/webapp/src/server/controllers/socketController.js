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

  if (dataType === "ticks") {
    socket.join(`share_ticks:${share}`);
  }

  if (dataType === "ema") {
    socket.join(`share_ema:${share}`);
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

  if (dataType === "ticks") {
    socket.leave(`share_tick:${share}`);
  }

  if (dataType === "ema") {
    socket.leave(`share_ema:${share}`);
  }
};

const handleDisconnection = (socket) => {
  console.log("A client disconnected:", socket.id);
  // Socket.io automatically handles room cleanup on disconnect
};

export { handleConnection };
