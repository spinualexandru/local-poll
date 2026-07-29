<img src="assets/logo.png" width="256" alt="logo" />
Zero dependency self-hosted poll system

![Demo](https://github.com/user-attachments/assets/49370821-dbf0-4818-a8fc-61709c372cf9)


# Development

```sh
npm install
cp .env.example .env
npm run dev
```

LocalPoll listens on `http://127.0.0.1:3000` by default. Set `HOST` and `PORT`
in `.env` to use a different address.

# Deployment

```sh
NODE_ENV=production node src/index.ts
```

The application serves regular HTTP. Terminate HTTPS in the deployment layer
with a reverse proxy or hosting platform.

# Features

# Roadmap


# Motivation

This project is a love letter to Node.js, TypeScript, and the surrounding community. ❤️

Having worked extensively with major JavaScript frameworks and tools like Express, React, and Angular, I've seen
firsthand how the ecosystem has evolved. Modern Node.js and the language itself now offer a greatly improved developer
experience with powerful built-in features that were once only available through external libraries.

This project is a deliberate step back to the fundamentals. It's an exploration of what's possible with zero
dependencies, celebrating the simplicity and power that modern JavaScript and Node.js provide out of the box. The goal
is to build a robust, self-hosted poll system that is a testament to the core capabilities of the platform, proving that
you don't always need a heavy framework to create something useful and reliable.

Made with Node.js 26
