"""PyInstaller entrypoint: first-run model setup."""

from __future__ import annotations


def main() -> None:
    from scripts.first_run_setup import main as run_setup

    run_setup()


if __name__ == "__main__":
    main()
