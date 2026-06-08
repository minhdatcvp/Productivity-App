"use client";

import type { ComponentProps } from "react";
import { Button } from "./button";
import { Spinner } from "./spinner";

type Props = ComponentProps<typeof Button> & {
  loading?: boolean;
};

export function LoadingButton({ loading, disabled, children, ...props }: Props) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading && <Spinner />}
      {children}
    </Button>
  );
}
