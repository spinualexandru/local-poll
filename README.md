<img src="assets/logo.png" width="256" alt="logo" />

**WORK IN PROGRESS**

Zero dependency self-hosted poll system

# Running

`npm start`

# Building

`npm run build`

# Development

Generate a SSL Certificate for the secure server
```sh
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj /CN=localhost/ -keyout localhost-privkey.pem -out localhost-cert.pem
```

Run the server
```sh
npm run dev
```

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

Made with Node.js 24.5.0
