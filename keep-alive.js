import express from "express";
const server = express();

server.all("/", (req, res) => {
  res.send("Bot is running!");
});

function keepAlive() {
  server.listen(3000, () => {
    console.log("🌐 Keep Alive Server aktif");
  });
}

export default keepAlive;
