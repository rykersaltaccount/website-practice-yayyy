# CodeVault

A personal programming knowledge base built with React, TypeScript, and Tailwind CSS.

## Features

- Track LeetCode problems with detailed reflections
- Create and organize programming notes
- Learn and connect programming concepts
- Track and review recurring mistakes
- Dashboard with statistics and recent activity
- Persistent storage using localStorage
- Responsive design with dark mode
- Docker support for easy deployment

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Docker (for containerized deployment)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Cloud Course Sync

Course sync uses the authenticated Supabase user. Run this once in the Supabase SQL editor before deploying:

```sql
create table if not exists public.courses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "Users can read their courses"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "Users can create their courses"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their courses"
  on public.courses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

The app keeps `localStorage` as an offline cache and uploads local-only courses when the user signs in.

### Building for Production

To build the production version:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Docker

The application can be built and run using Docker.

#### Building the Docker Image

```bash
docker build -t codevault .
```

#### Running the Container

```bash
docker run -p 8080:80 codevault
```

Then visit `http://localhost:8080` to use the application.

#### Docker Compose (Optional)

You can also use docker-compose:

```yaml
version: '3.8'
services:
  codevault:
    build: .
    ports:
      - "8080:80"
```

Then run:

```bash
docker-compose up -d
```

## Project Structure

- `src/components` - Reusable UI components
- `src/pages` - Page components
- `src/contexts` - React context providers
- `src/hooks` - Custom hooks
- `src/types` - TypeScript type definitions
- `src/App.tsx` - Main application component
- `src/main.tsx` - Entry point

## Features in Detail

### LeetCode Tracking

- Add, edit, and delete LeetCode problems
- Track difficulty, topics, date solved
- Detailed reflection sections:
  - What was difficult?
  - What did you initially think?
  - What finally made it click?
  - Concept learned
  - Mistake to avoid next time
  - Confidence rating (1-5)

### Notes

- Create notes with title, content, tags, and category
- Search and filter notes
- Edit and delete notes

### Concepts

- Create programming concepts (e.g., Hashmaps, Binary Search)
- Link concepts to related LeetCode problems and notes
- Edit and delete concepts

### Mistakes

- Track recurring mistakes
- Mark mistakes as reviewed or to review
- Add learning logs for each mistake
- Link mistakes to related concepts and problems

## Technology Stack

- React 19
- TypeScript
- Tailwind CSS
- Vite
- React Router DOM
- localStorage for persistence
- Docker for containerization

## Design

- Dark, clean, developer-oriented design
- Responsive layout with sidebar and main content
- Intuitive navigation and user experience

## Future Enhancements

- Add authentication and sync across devices
- Implement a backend for data persistence
- Add export/import functionality
- Integrate with LeetCode API for automatic problem fetching
- Add spaced repetition system for mistake review

## License

This project is open source and available under the MIT License."# website-practice" 
