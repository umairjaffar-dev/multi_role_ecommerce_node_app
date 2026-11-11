COUNT_LINE = {"y": 350, "x_min": 200, "x_max": 1200}


def crossing_direction(prev_y: int, cur_y: int, line_y: int) -> str | None:
    """Return "in" if the point moved down across the line, "out" if it moved up
    across it, otherwise None."""
    # TODO: your 4-6 lines here
    if prev_y < line_y <= cur_y:
        return "in"
    elif prev_y >= line_y > cur_y:
        return "out"
    else:
        return None


if __name__ == "__main__":
    assert crossing_direction(340, 356, 350) == "in"
    assert crossing_direction(356, 340, 350) == "out"
    assert crossing_direction(300, 320, 350) is None  # both above the line
    assert crossing_direction(360, 380, 350) is None  # both below the line
    assert crossing_direction(345, 350, 350) == "in"  # landing exactly on the line
    assert crossing_direction(350, 349, 350) == "out"
    assert crossing_direction(350, 350, 350) is None  # car stopped ON the line
    assert (
        crossing_direction(350, 360, 350) is None
    )  # already below, moving further down
    print("all tests passed")
    


class LineCounter:
    def __init__(self, line_y: int) -> None:
        self.line_y = line_y
        self.previous_y: dict[int, int] = {}
        self.counted_ids: set[int] = set[int]()
        self.counts = {"in": 0, "out": 0}

    def update(self, track_id: int, cur_y: int) -> str | None:
        """Feed one tracked point for the current frame.
        Returns "in" / "out" if this id gets counted right now, otherwise None."""
        # 1. Read this id's previous y (None if we see it for the first time)
        prev_y = self.previous_y.get(track_id)

        # 2. Save cur_y as its previous y for the next frame
        self.previous_y[track_id] = cur_y

        # 3. First sighting, or already counted?  -> return None
        if prev_y is None or track_id in self.counted_ids:
            return None

        # 4. Ask crossing_direction(); if it says "in"/"out":
        direction = crossing_direction(prev_y, cur_y, self.line_y)
        if direction is None:
            return None

        #    mark the id as counted, add 1 to counts, return the direction
        # 5. Otherwise return None
        self.counted_ids.add(track_id)
        self.counts[direction] += 1
        return direction
