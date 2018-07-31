const url = "http://localhost:3000/machines";

$(document).ready(function () {
    $("#jqGrid").jqGrid({
        mtype: "GET",
        // url: url,
        url: get_data(),
        // datatype: 'json',
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
        // loadonce: true,
        sortname: "name",
        viewrecords: true,
        // beforeProcessing: function (data) {
        //     organize_machines_data(data);
        // },
        height: 450,
        width: 1300,
        rowNum: 10000,
        cmTemplate: {editable: true},
        sortable: true,
        pager: "#jqGridPager",
        forceClientSorting: true,
        // loadComplete: function () {
        //     let $self = $(this);
        //     let data = $self.jqGrid('getGridParam','data');
        //     // organize_machines_data(data);
        //
        //     if ($self.jqGrid("getGridParam", "datatype") === "json") {
        //         setTimeout(function () {
        //             $self.trigger("reloadGrid"); // Call to fix client-side sorting
        //         }, 50);
        //     }
        // },

    });


});


function get_data()
{
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
            rows.push({
                'name': rack['name'] + "-" + machine['display_name'],
                'type': machine['type'],
                'state': machine['state'],
                'used_by': machine['user_name'],
                'labels': machine['host_label'],
                'uptime': machine['last_inauguration_date'],
                'allocation_id': machine['allocation']})
        }

    }
    data.rows = rows;
    return rows;
}