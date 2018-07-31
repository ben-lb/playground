const url = "http://localhost:3000/machines";

$(document).ready(function () {
    $("#jqGrid").jqGrid({
        mtype: "GET",
        url: get_data(),
        datatype: 'local',
        styleUI : 'Bootstrap',
        colModel: [
            { label: 'Name / ID', name: 'name', key: true, width: 130 },
            { label: 'Type', name: 'type', width: 100 },
            { label: 'State', name: 'state', width: 100 },
            { label: 'Used by', name: 'used_by', width: 100 },
            { label:'Labels', name: 'labels', width: 350 },
            { label:'Uptime', name: 'uptime', width: 150 },
            { label:'Allocation ID', name: 'allocation_id', width: 250 },
        ],
        sortname: "name",
        viewrecords: true,
        height: 450,
        width: 1300,
        rowNum: 10000,
        cmTemplate: {editable: true},
        sortable: true,
        pager: "#jqGridPager",
        forceClientSorting: true,
    });


});


function get_data() {
    $.ajax({
        type: "GET",
        datatype: 'json',
        url: url,
        success: function (data) {
            data = organize_machines_data(data);
            $('#jqGrid').jqGrid('setGridParam', {data: data}).trigger('reloadGrid');
        }
    })
}

function organize_machines_data(data) {
    let rows = [];
    for(let i = 0; i < data.length; i++)
    {
        let rack = data[i];
        for(let j = 0; j < rack['machines'].length; j++)
        {
            let machine = rack['machines'][j];
            for(let k = 0; k < machine['vms'].length; k++)
            {
                let vm = machine['vms'][k];
                add_machine(rows, vm);
            }
            add_machine(rows, machine);
        }

    }
    return rows;
}

function add_machine(rows, machine) {
    rows.push({
                'name': machine['id'],
                'type': machine['type'],
                'state': machine['state'],
                'used_by': machine['user_name'],
                'labels': machine['host_label'],
                'uptime': machine['last_inauguration_date'],
                'allocation_id': machine['allocation']})
}