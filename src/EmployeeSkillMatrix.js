import React, { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';

const EmployeeSkillMatrix = ({ detailers, currentTheme }) => {
    const svgRef = useRef(null);

    const { data, skillNames, employeeNames, employeeTradeMap } = useMemo(() => {
        const generalSkillOrder = ["Model Knowledge", "BIM Knowledge", "Leadership Skills", "Mechanical Abilities", "Teamwork Ability"];
        const disciplineSkillOrder = ["Piping", "Duct", "Plumbing", "Coordination", "BIM", "Structural", "GIS/GPS"];
        const skillNames = [...generalSkillOrder, ...disciplineSkillOrder];

        const sortedDetailers = [...detailers].sort((a, b) => {
            const tradeA = a.disciplineSkillsets?.[0]?.name || 'Z';
            const tradeB = b.disciplineSkillsets?.[0]?.name || 'Z';
            if (tradeA !== tradeB) {
                return tradeA.localeCompare(tradeB);
            }
            return a.lastName.localeCompare(b.lastName);
        });

        const employeeNames = sortedDetailers.map(d => `${d.firstName} ${d.lastName}`);
        
        const employeeTradeMap = new Map();
        sortedDetailers.forEach(d => {
             const trade = d.disciplineSkillsets?.[0]?.name || 'Uncategorized';
             employeeTradeMap.set(`${d.firstName} ${d.lastName}`, trade);
        });

        const flatData = [];
        sortedDetailers.forEach(detailer => {
            const employeeName = `${detailer.firstName} ${detailer.lastName}`;
            
            // General Skills
            generalSkillOrder.forEach(skill => {
                const score = detailer.skills?.[skill] || 0;
                flatData.push({ employee: employeeName, skill, score });
            });

            // Discipline Skills
            const disciplineMap = new Map((detailer.disciplineSkillsets || []).map(ds => [ds.name, ds.score]));
            disciplineSkillOrder.forEach(skill => {
                const score = disciplineMap.get(skill) || 0;
                flatData.push({ employee: employeeName, skill, score });
            });
        });

        return { data: flatData, skillNames, employeeNames, employeeTradeMap };
    }, [detailers]);

    useEffect(() => {
        if (!data.length || !svgRef.current) return;

        // Increased top margin by 50px (72 + 50 = 122)
        const margin = { top: 122, right: 50, bottom: 50, left: 160 }; 
        const cellWidth = 36;
        const cellHeight = 36;
        
        const width = employeeNames.length * cellWidth + margin.left + margin.right;
        const height = skillNames.length * cellHeight + margin.top + margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);

        svg.selectAll("*").remove();

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
            
        const tooltip = d3.select("body").append("div")
            .attr("class", "absolute opacity-0 transition-opacity duration-300 bg-gray-900 text-white text-xs rounded-md p-2 pointer-events-none shadow-lg z-50 border border-gray-700");

        // X scale is now for Employees
        const x = d3.scaleBand()
            .domain(employeeNames)
            .range([0, employeeNames.length * cellWidth])
            .padding(0.1);

        // Y scale is now for Skills
        const y = d3.scaleBand()
            .domain(skillNames)
            .range([0, skillNames.length * cellHeight])
            .padding(0.1);

        const radius = d3.scaleSqrt()
            .domain([0, 10])
            .range([0, Math.min(cellWidth, cellHeight) / 2 - 4]);
            
        const color = d3.scaleLinear()
            .domain([1, 6, 10])
            .range(["#FF0000", "#FFFF00", "#004d00"]) // Red, Yellow, Darker Green
            .interpolate(d3.interpolateRgb);

        // Add cell borders
        chart.selectAll(".cell")
            .data(data)
            .enter().append("rect")
            .attr("class", "cell")
            .attr("x", d => x(d.employee))
            .attr("y", d => y(d.skill))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", "transparent")
            .style("stroke", "white")
            .style("stroke-width", 0.25)
            .style("stroke-opacity", 0.8);

        // X-axis labels (Employees)
        const xAxis = chart.append("g")
            .attr("class", "x-axis")
            .selectAll("g")
            .data(employeeNames)
            .enter().append("g")
            .attr("transform", d => `translate(${x(d) + x.bandwidth() / 2}, 0)`);

        xAxis.append("text")
            .text(d => d)
            .attr("transform", "rotate(-65)")
            .attr("dy", "0.32em")
            .attr("y", -10)
            .attr("x", 0)
            .attr("text-anchor", "start")
            .style("font-size", "11px") // Reduced font size
            .style("font-weight", "600")
            .style("fill", "white");
            
        // Y-axis labels (Skills)
        const yAxis = chart.append("g")
            .attr("class", "y-axis")
            .selectAll("g")
            .data(skillNames)
            .enter().append("g")
            .attr("transform", d => `translate(0, ${y(d) + y.bandwidth() / 2})`);
            
        yAxis.append("text")
            .text(d => d)
            .attr("x", -15)
            .attr("text-anchor", "end")
            .style("font-size", "11px") // Reduced font size
            .style("font-weight", "600")
            .style("fill", "white");

        // Bubbles
        chart.selectAll(".bubble")
            .data(data)
            .enter().append("circle")
            .attr("class", "bubble")
            // Swap cx and cy
            .attr("cx", d => x(d.employee) + x.bandwidth() / 2)
            .attr("cy", d => y(d.skill) + y.bandwidth() / 2)
            .attr("r", 0) // Start with 0 radius for animation
            .style("fill", d => d.score > 0 ? color(d.score) : "transparent")
            .style("stroke", d => d.score > 0 ? d3.color(color(d.score)).darker(0.7) : currentTheme.borderColor)
            .style("stroke-width", 1)
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<strong>${d.employee}</strong><br/>${d.skill}: <strong>${d.score}</strong>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                d3.select(this).style("stroke-width", 2.5).style("stroke", "black");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
                d3.select(this).style("stroke-width", 1).style("stroke", d => d.score > 0 ? d3.color(color(d.score)).darker(0.7) : currentTheme.borderColor);
            })
            .transition() // Add transition for bubble radius
            .duration(500)
            .delay((d, i) => i * 2)
            .attr("r", d => radius(d.score));
            
        return () => { tooltip.remove() };

    }, [data, skillNames, employeeNames, employeeTradeMap, currentTheme]);

    return (
        <div id="skill-matrix-printable-area">
            <div style={{ maxHeight: '80vh', overflow: 'auto' }} className="hide-scrollbar-on-hover p-4">
                <svg ref={svgRef}></svg>
            </div>
        </div>
    );
};

export default EmployeeSkillMatrix;
