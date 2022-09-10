import type { Joke, LikedJokes } from "@prisma/client";
import type {
  ActionFunction,
  LoaderFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useCatch,
  useParams,
  Form,
} from "@remix-run/react";

import { db } from "~/util/db.server";
import {
  getUserId,
  requireUserId,
} from "~/util/session.server";

type LoaderData = { joke: Joke; isOwner: boolean, likes: Array<LikedJokes> };

export const loader: LoaderFunction = async ({
  request,
  params,
}) => {
  const userId = await getUserId(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }
  const likes = await db.likedJokes.findMany({
    where: {jokeId: params.jokeId}
  })
  const data: LoaderData = {
    joke,
    likes,
    isOwner: userId === joke.jokesterId,
  };
  return json(data);
};

export const action: ActionFunction = async ({
  request,
  params,
}) => {
  const form = await request.formData();
  if (form.get("_method") !== "delete" && form.get("_method") !== "like") {
    throw new Response(
      `The _method ${form.get("_method")} is not supported`,
      { status: 400 }
    );
  }

  const userId = await requireUserId(request);

  switch(form.get("_method")) {
    case("delete"):
      const joke = await db.joke.findUnique({
        where: { id: params.jokeId },
      });
      if (!joke) {
        throw new Response("Can't delete what does not exist", {
          status: 404,
        });
      }
      if (joke.jokesterId !== userId) {
        throw new Response(
          "Pssh, nice try. That's not your joke",
          {
            status: 401,
          }
        );
      }
      await db.joke.delete({ where: { id: params.jokeId } });
      return redirect("/jokes");

    case("like"):

    const like = {
      userId: userId,
      jokeId: params.jokeId!
    }

    //The cookie persists longer than the UI. The server thinks you're logged in whiile the UI doesn't reflect it.
    //I guess?
    if(!userId) {
      throw new Response("You need to be logged in to like a joke", {
        status: 403
      })
    }

    const existingLike = await db.likedJokes.findMany({
      where: {
        userId: userId,
        jokeId: params.jokeId!       
      },
    })


    //I've had issues with find / delete when it's unique.
    if(existingLike.length > 0) {
      const deletedLike = await db.likedJokes.deleteMany({
        where: {
          userId: userId,
          jokeId: params.jokeId!    
        }
      })

      return deletedLike
    } else {
      const newLike = await db.likedJokes.create({
        data: {...like}
      })
      return newLike
    }
  }

};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
      <div className="button-container">
      {data.isOwner ? (
        <Form method="post">
          <input
            type="hidden"
            name="_method"
            value="delete"
          />
          <button type="submit" className="button">
            Delete
          </button>
        </Form>
      ) : (
      <Form method="post">
        <input type="hidden" /> 
          <button  type="submit"
          name="_method"
          value="like"
          className="button">
            Like ({data.likes.length})
          </button>
      </Form>
      )}
      </div>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  switch (caught.status) {
    case 400: {
      return (
        <div className="error-container">
          What you're trying to do is not allowed.
        </div>
      );
    }
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is {params.jokeId}?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {params.jokeId} is not your joke.
        </div>
      );
    }
    case 403: {
      return (
        <div className="error-container">
         You've forgot to log In?
      </div>
      )
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}