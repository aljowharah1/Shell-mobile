BEGIN {
    FS=","
    target = 55
}

{
    lat[NR] = $1
    lon[NR] = $2
    sum_lat += $1
    sum_lon += $2
}

END {
    total = NR
    step = int(total / target)
    if (step < 1) step = 1

    print "// Total coordinates:", total
    print "// Sampling every", step, "points"
    print ""
    print "outline: ["

    count = 0
    for (i = 1; i <= total && count < target; i += step) {
        printf "    [%s, %s],\n", lat[i], lon[i]
        count++
    }

    print "]"
    print ""
    print "// Center point:"
    printf "center: [%.6f, %.6f]\n", sum_lat/total, sum_lon/total
}