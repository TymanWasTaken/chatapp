import { EventEmitter } from 'events';
import express, { Request, Response } from 'express';
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import * as path from "path"
import { verboseLog } from './utils';

interface ClientSocketOptions {
	room: string,
	username: string
}

declare module 'socket.io' {
	export interface Socket {
	   registered?: boolean
	   data?: ClientSocketOptions
	}
}

const app = express();
const server = createServer(app);
const port = 8463;
const io = new Server(server);

const waitForEvent = (emitter: EventEmitter, event: string, timeout: number): Promise<unknown[]> => {
	return new Promise((resolve, reject) => {
		const timeoutReject = setTimeout(() => {
			reject()
		}, timeout)
		emitter.once(event, (...args: unknown[]) => {
			clearTimeout(timeoutReject)
			resolve(args)
		})
	})
}

app.set('trust proxy', true)

app.get('/', (req: Request, res: Response) => {
	res.sendFile(path.resolve("static/index.html"));
});

io.on("connection", async (socket: Socket) => {
	verboseLog(`Socket ${socket.id} (${socket.handshake.address}) connected, waiting for initInstance event (5s timeout)...`)
	try {
		const initInstanceEvent = (await waitForEvent(socket, "initInstance", 5000))[0] as ClientSocketOptions
		verboseLog(`Socket ${socket.id} emitted initInstance, registering`)
		socket.join(initInstanceEvent.room)
		socket.registered = true
		socket.data = initInstanceEvent
		verboseLog(`Socket ${socket.id} registered`)
		socket.on("message", data => {
			if (!(socket.registered && socket.data)) {
				return socket.emit("notRegistered")
			}
			socket.broadcast.in(socket.data.room).emit("message", {
				clientData: socket.data,
				messageData: data
			})
		})
	} catch {
		verboseLog(`Socket ${socket.id} timed out, disconnecting :/`)
		socket.disconnect(true)
	}
});

server.listen(port, () => {
	console.log(`Example app listening on port ${port}!`)
});