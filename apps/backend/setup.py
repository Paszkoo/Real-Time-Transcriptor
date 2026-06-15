"""Project packaging (pyproject.toml) and first-run model setup entrypoint.

Manual model setup:  python setup.py
Setuptools/pip:      python setup.py egg_info  (handled automatically by pip)
"""

from setuptools import setup


def run_model_setup() -> None:
    from scripts.first_run_setup import main

    main()


if __name__ == "__main__":
    import sys

    # pip/setuptools always pass a command (egg_info, editable_wheel, …)
    if len(sys.argv) == 1:
        run_model_setup()
    else:
        setup()
