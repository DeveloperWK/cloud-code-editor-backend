# Cloud Code Editor Backend

This project is the backend for a cloud-based code editor. It provides a robust and scalable environment for running user projects in isolated Docker containers. The backend is built with Node.js, Express, and TypeScript, and it uses Supabase for database and file storage.

## Features

- **Isolated Project Environments:** Each user project runs in a dedicated Docker container, providing a secure and isolated environment.
- **Real-time File Synchronization:** Project files are stored in Supabase Storage and are synchronized in real-time with the local filesystem and the running Docker container. File operations are handled via Socket.IO.
- **Interactive Terminal:** An interactive terminal is provided for each project, allowing users to execute commands in their container. This is implemented using `node-pty` and Socket.IO.
- **Scalable Architecture:** The application is designed for scalability, using Node.js clustering to handle multiple concurrent users.
- **RESTful API:** A RESTful API is provided for project management, including creating, deleting, and managing projects.

## Technology Stack

- **Backend:** Node.js, Express, TypeScript
- **Real-time Communication:** Socket.IO
- **Database and Storage:** Supabase
- **Containerization:** Docker
- **Authentication:** JWT

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker
- A Supabase account

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Install the dependencies:
    ```bash
    pnpm install
    ```

### Configuration

1.  Create a `.env` file in the root of the project.
2.  Add the following environment variables to the `.env` file:
    ```
    SUPABASE_URL=<your-supabase-url>
    SUPABASE_KEY=<your-supabase-key>
    JWT_SECRET=<your-jwt-secret>
    ```

### Running the Application

To run the application in development mode, use the following command:

```bash
pnpm dev
```

This will start the server on `http://localhost:3000`.

## Architecture Overview

The backend is designed to be stateless and scalable. When a user opens a project, the following steps occur:

1.  The project files are downloaded from Supabase Storage to the host server.
2.  A new Docker container is created for the project.
3.  The project files are volume-mounted into the Docker container.
4.  A Socket.IO connection is established for real-time communication.

All file system operations (create, delete, write) are handled in real-time via Socket.IO and are synchronized back to Supabase Storage. This ensures that the project state is always persisted, even if the Docker container is stopped or removed.

The interactive terminal is created by opening a pseudo-terminal in the Docker container and streaming the input and output over Socket.IO.

Long-running Docker operations, such as creating containers and pulling images, are offloaded to worker threads to avoid blocking the main event loop.
