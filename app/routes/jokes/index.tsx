import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useCatch } from "@remix-run/react";
import type { Joke } from "@prisma/client";

import { db } from "~/util/db.server";

type LoaderData = { randomJoke: Joke};

export const loader: LoaderFunction = async () => {
  const count = await db.joke.count();
  const randomRowNumber = Math.floor(Math.random() * count);
  const [randomJoke] = await db.joke.findMany({
    take: 1, 
    skip: randomRowNumber
  })

  if(!randomJoke) {
    throw new Response("No random joke for you", {
      status: 404
    })
  }
  const data: LoaderData = { randomJoke};
  return json(data);
}

export default function JokesIndexRoute() {
  const data = useLoaderData<LoaderData>();
    return (
      <div>
      <h2>Here's a random joke:</h2>
      <p>{data.randomJoke.content}</p>
      <Link to={data.randomJoke.id}>
        "{data.randomJoke.name}" Permalink
      </Link>
    </div>
    );
  }

  export function ErrorBoundary() {
    return (
      <div className="error-container">
        I did a whoopsies.
      </div>
    );
  }

  export function CatchBoundary() {
    const caught = useCatch();
  
    if (caught.status === 404) {
      return (
        <div className="error-container">
          There are no jokes to display.
        </div>
      );
    }
    throw new Error(
      `Unexpected caught response with status: ${caught.status}`
    );
  }